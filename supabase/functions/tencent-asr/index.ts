import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 使用 Web Crypto API 生成签名
async function generateSignature(
  secretId: string,
  secretKey: string,
  host: string,
  payload: string,
  timestamp: number
) {
  const encoder = new TextEncoder();
  const service = "asr";
  const algorithm = "TC3-HMAC-SHA256";
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];
  
  // 1. 拼接规范请求串
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  
  // 计算 payload hash
  const payloadData = encoder.encode(payload);
  const payloadHashBuffer = await crypto.subtle.digest("SHA-256", payloadData);
  const hashedRequestPayload = Array.from(new Uint8Array(payloadHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  
  // 2. 拼接待签名字符串
  const credentialScope = `${date}/${service}/tc3_request`;
  const canonicalRequestData = encoder.encode(canonicalRequest);
  const canonicalHashBuffer = await crypto.subtle.digest("SHA-256", canonicalRequestData);
  const hashedCanonicalRequest = Array.from(new Uint8Array(canonicalHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
  
  // 3. 计算签名 - 使用 HMAC
  const getKey = async (key: ArrayBuffer | string, message: string) => {
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    const messageData = encoder.encode(message);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    return await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  };
  
  const kDate = await getKey(`TC3${secretKey}`, date);
  const kService = await getKey(kDate, service);
  const kSigning = await getKey(kService, "tc3_request");
  const signatureData = await getKey(kSigning, stringToSign);
  
  const signature = Array.from(new Uint8Array(signatureData))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // 4. 拼接 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return authorization;
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

    const secretId = Deno.env.get('TENCENT_SECRET_ID');
    const secretKey = Deno.env.get('TENCENT_SECRET_KEY');
    
    if (!secretId || !secretKey) {
      throw new Error('Tencent Cloud credentials not configured');
    }

    const host = "asr.tencentcloudapi.com";
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 构建请求体
    const payload = JSON.stringify({
      EngineModelType: "16k_zh",
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 1,
      Data: audio, // base64 编码的音频数据
    });

    // 生成签名
    const authorization = await generateSignature(
      secretId,
      secretKey,
      host,
      payload,
      timestamp
    );

    // 调用腾讯云 API
    const response = await fetch(`https://${host}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': host,
        'X-TC-Action': 'SentenceRecognition',
        'X-TC-Version': '2019-06-14',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': 'ap-guangzhou',
        'Authorization': authorization,
      },
      body: payload,
    });

    const result = await response.json();
    
    console.log('Tencent ASR response:', result);

    if (result.Response?.Error) {
      throw new Error(`Tencent API error: ${result.Response.Error.Message}`);
    }

    return new Response(
      JSON.stringify({ 
        text: result.Response?.Result || '',
        requestId: result.Response?.RequestId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tencent-asr:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
