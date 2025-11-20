import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 生成阿里云签名
function generateSignature(
  accessKeySecret: string,
  method: string,
  headers: Record<string, string>,
  resource: string
): string {
  // 构建待签名字符串
  const contentMd5 = headers['content-md5'] || '';
  const contentType = headers['content-type'] || '';
  const date = headers['date'] || '';
  
  // 获取并排序 x-acs- 开头的headers
  const acsHeaders = Object.keys(headers)
    .filter(key => key.toLowerCase().startsWith('x-acs-'))
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key]}`)
    .join('\n');
  
  const stringToSign = [
    method,
    contentMd5,
    contentType,
    date,
    acsHeaders ? acsHeaders + '\n' : '',
    resource
  ].join('\n');
  
  // 使用 HMAC-SHA1 生成签名
  const hmac = createHmac('sha1', accessKeySecret);
  hmac.update(stringToSign);
  const signature = hmac.digest('base64');
  
  return signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const accessKeyId = Deno.env.get('ALIBABA_ACCESS_KEY_ID');
    const accessKeySecret = Deno.env.get('ALIBABA_ACCESS_KEY_SECRET');
    
    if (!accessKeyId || !accessKeySecret) {
      throw new Error('Alibaba Cloud credentials not configured');
    }

    // 将 base64 转换为二进制
    const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    console.log('Audio data length:', audioBuffer.length, 'bytes');
    
    // 阿里云 API 配置
    const url = 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr';
    const resource = '/stream/v1/asr';
    const method = 'POST';
    const date = new Date().toUTCString();
    
    // 构建请求头
    const headers: Record<string, string> = {
      'date': date,
      'content-type': 'application/octet-stream',
      'x-acs-signature-method': 'HMAC-SHA1',
      'x-acs-signature-version': '1.0',
    };
    
    // 生成签名
    const signature = generateSignature(accessKeySecret, method, headers, resource);
    const authorization = `acs ${accessKeyId}:${signature}`;
    
    // 构建完整的请求参数
    const params = new URLSearchParams({
      appkey: accessKeyId.split('-')[0], // 使用 AccessKeyId 的前缀作为 appkey
      format: 'opus', // webm 通常使用 opus 编码
      sample_rate: '16000',
      enable_intermediate_result: 'false',
      enable_punctuation_prediction: 'true',
      enable_inverse_text_normalization: 'true',
    });

    // 调用阿里云 API
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Authorization': authorization,
      },
      body: audioBuffer,
    });

    const result = await response.json();
    
    console.log('Alibaba ASR response:', result);

    if (!response.ok || result.status !== 20000000) {
      throw new Error(`Alibaba API error: ${result.message || 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify({ 
        text: result.result || '',
        requestId: result.header?.task_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in alibaba-asr:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
