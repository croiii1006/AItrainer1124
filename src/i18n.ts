import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      /* ======================
         通用
      ====================== */
      homeTitle: "训练中心",
      startTraining: "开始训练",

      common: {
        notSelected: "未选择",
        on: "已开启",
        off: "已关闭",
      },

      /* ======================
         Index / Session Toast
      ====================== */
      toast: {
        record: {
          start: { title: "开始录音", desc: "正在录制您的语音..." },
          startFail: { title: "录音失败", desc: "无法启动录音" },
          transcribing: { title: "识别中", desc: "正在将语音转换为文字..." },
          success: { title: "识别成功", desc: "已将您的语音转为文字并发送" },
          empty: { title: "未识别到语音", desc: "请重试" },
          fail: { title: "识别失败", desc: "无法识别语音" },
        },
        session: {
          configMissing: { title: "配置不完整", desc: "请先完成所有配置项" },
          startOk: { title: "训练开始", desc: "AI 顾客已准备好，请开始对话" },
          startFail: { title: "启动失败", desc: "无法启动训练会话，请稍后重试" },
          sendFail: { title: "发送失败", desc: "消息发送失败，请重试" },
          evalOk: { title: "评分完成", desc: "您的综合得分为 {{score}} 分" },
          evalFail: { title: "评分失败", desc: "无法生成评分，请稍后重试" },
          reset: { title: "已重置", desc: "所有配置已清空" },
        },
      },

      /* ======================
         ChatPanel
      ====================== */
      chat: {
        sessionStatus: {
          notStarted: "未开始",
          active: "进行中",
          ended: "已结束",
        },
        round: "第 {{current}} / {{total}} 轮",

        toast: {
          mediaGranted: { title: "摄像头已开启", desc: "视频和音频权限已授予" },
          mediaDenied: {
            title: "权限被拒绝",
            desc: "无法访问摄像头或麦克风，请检查浏览器权限设置",
          },
        },

        video: {
          permissionDenied: "摄像头权限未授予",
          requestAgain: "重新请求权限",
          statusLine: "摄像头：{{camera}} ｜ 麦克风：{{mic}}",
          turnOffCamera: "关闭摄像头",
          turnOnCamera: "开启摄像头",
          mute: "静音",
          unmute: "取消静音",
          customerScene: "AI 顾客场景",
          placeholder: "(占位)",
          note:
            "当前版本只展示销售实时视频和顾客静态场景，后续将接入 AI 视频 Avatar 与表情 / 注意力分析。",
        },

        emptyHint:
          "请在左侧完成训练配置后，点击「开始训练」以生成 AI 顾客并开启模拟对话。",

        role: {
          sales: "销售 Sales",
          customer: "AI 顾客 Customer",
        },

        playCustomerVoice: "播放顾客语音",

        footer: {
          note:
            "说明：当前只做前端演示，实际录制与多模态分析将在接入后端与大模型时实现。",
        },

        recording: {
          inProgress: "录音中…",
          notStarted: "未开始录音",
        },

        actions: {
          redo: "重新录制",
          sendRound: "发送本轮分析",
          startRecording: "开始录音",
          stopRecording: "结束录音",
        },
      },

      /* ======================
         Header
      ====================== */
      header: {
        title: "AI 销售训练 Lite",
        subtitle: "AI 顾客对话模拟 · 销售场景训练",
        badge: "Demo 版本 – 支持 Trae 集成",
      },

      /* ======================
         ConfigPanel
      ====================== */
      config: {
        title: "训练配置",
        brand: {
          label: "品牌 Brand",
          placeholder: "请选择训练品牌",
        },
        persona: {
          label: "顾客画像",
          placeholder: "选择顾客类型",
          options: {
            hnw: "高净值顾客",
            tourist: "旅游客",
            hesitant: "犹豫型顾客",
            gift: "礼物购买者",
            priceSensitive: "价格敏感型顾客",
          },
        },
        scenario: {
          label: "销售场景",
          placeholder: "选择场景",
          options: {
            firstVisit: "首次进店",
            vipReturn: "VIP 回访",
            giftForBoss: "购买送老板的礼物",
            dutyFree: "机场免税店场景",
            onlineInquiry: "线上咨询",
          },
        },
        difficulty: {
          label: "难度等级",
          options: {
            basic: "基础",
            intermediate: "中级",
            advanced: "高级",
          },
        },
        actions: {
          start: "开始训练",
          reset: "重置配置",
        },
        footer: {
          note: "当前为 Demo 演示版，AI 逻辑将在下一版本接入 Trae。",
        },
      },

      /* ======================
         ResultPanel
      ====================== */
      result: {
        header: {
          title: "会话信息",
          subtitle: "开始训练后，这里会显示多维度会话分析结果。",
        },

        tabs: {
          realtime: "实时提示",
          score: "评分结果",
          summary: "会话摘要",
        },

        status: {
          notStarted: "未开始",
          inProgress: "进行中",
          completed: "已完成",
        },

        realtimeTips: {
          speed: { title: "语速控制", suggestion: "可以稍微放慢语速，让客户更易理解。" },
          politeness: { title: "语气礼貌度", suggestion: "保持友好热情的语气，增强客户信任感。" },
          structure: { title: "结构清晰度", suggestion: "建议分点阐述产品优势，结构更清晰。" },
        },

        realtimeFuture: {
          title: "未来：实时情绪/语气监测",
          desc: "此处预留接入多模态模型（语音情绪/表情）后的实时提示组件。",
        },

        score: {
          realOverallLabel: "本次会话综合评分",
          placeholderOverallValue: "82",
          placeholderOverallLabel: "本次会话综合评分（占位）",
          dimensionTitle: "维度评分",
          placeholderDimTitle: "维度评分（示例数据）",
        },

        dimensions: {
          needsDiscovery: "需求挖掘",
          productKnowledge: "产品知识",
          objectionHandling: "异议处理",
          emotionalConnection: "情绪沟通",
          closingSkill: "成交引导",
        },

        mockDims: {
          contentExpression: "内容表达",
          tonePolite: "语气礼貌",
          emotionStable: "情绪稳定",
          customerFocus: "客户关注度",
          professionalImage: "专业形象",
        },

        radar: {
          title: "评分雷达图占位",
          code: "id = 'scoreRadarPlaceholder'",
          desc: "后续接入图表库使用",
        },

        summary: {
          placeholderIntro: "AI 分析后将生成本次模拟的整体评价、关键优点和需要改进的点。",
          overallTitle: "整体评价",
          overallText:
            "本次销售模拟中，您展现了良好的专业素养和沟通技巧。对产品的理解较为深入，能够准确把握客户需求并给出针对性建议。",
          strengthsTitle: "优点亮点",
          strengths: [
            "语言表达清晰流畅，逻辑性强",
            "善于倾听客户需求，能及时捕捉关键信息",
            "产品介绍专业到位，突出了核心卖点",
          ],
          improvementTitle: "改进建议",
          improvements: [
            "可以增加更多情感共鸣，建立更深层次的客户联系",
            "对客户异议的处理可以更加灵活，提供多角度解决方案",
            "建议在适当时机更主动地引导成交，把握销售节奏",
          ],
        },

        export: {
          placeholder: "导出报告（占位）",
        },
      },
    },
  },

  /* ================================================================= */

  en: {
    translation: {
      /* ======================
         Common
      ====================== */
      homeTitle: "Training Center",
      startTraining: "Start Training",

      // ✅ 你要求补上的 common
      common: {
        notSelected: "Not selected",
        on: "On",
        off: "Off",
      },

      /* ======================
         Index / Session Toast
      ====================== */
      toast: {
        record: {
          start: { title: "Recording started", desc: "Recording your voice..." },
          startFail: { title: "Recording failed", desc: "Unable to start recording" },
          transcribing: { title: "Transcribing", desc: "Converting speech to text..." },
          success: { title: "Transcription complete", desc: "Text has been sent" },
          empty: { title: "No speech detected", desc: "Please try again" },
          fail: { title: "Transcription failed", desc: "Unable to transcribe audio" },
        },
        session: {
          configMissing: { title: "Incomplete configuration", desc: "Please complete all required fields" },
          startOk: { title: "Training started", desc: "AI customer is ready. Start the conversation." },
          startFail: { title: "Start failed", desc: "Unable to start session. Please try again later." },
          sendFail: { title: "Send failed", desc: "Message failed to send. Please retry." },
          evalOk: { title: "Evaluation complete", desc: "Your overall score is {{score}}" },
          evalFail: { title: "Evaluation failed", desc: "Unable to generate evaluation" },
          reset: { title: "Reset completed", desc: "All configurations have been cleared" },
        },
      },

      /* ======================
         ChatPanel
      ====================== */
      chat: {
        sessionStatus: {
          notStarted: "Not Started",
          active: "In Progress",
          ended: "Completed",
        },

        round: "Round {{current}} / {{total}}",

        toast: {
          mediaGranted: { title: "Camera Enabled", desc: "Video and audio permissions granted" },
          mediaDenied: {
            title: "Permission Denied",
            desc: "Unable to access camera or microphone. Please check browser settings.",
          },
        },

        video: {
          permissionDenied: "Camera permission not granted",
          requestAgain: "Request Permission Again",
          statusLine: "Camera: {{camera}} | Mic: {{mic}}",
          turnOffCamera: "Turn off camera",
          turnOnCamera: "Turn on camera",
          mute: "Mute",
          unmute: "Unmute",
          customerScene: "AI Customer Scene",
          placeholder: "(Placeholder)",
          note:
            "This version only displays the sales agent's live video and a static customer scene. AI video avatars and expression/attention analysis will be added later.",
        },

        emptyHint:
          "Please complete the training configuration on the left and click “Start Training” to generate an AI customer and begin the simulated conversation.",

        role: {
          sales: "Sales",
          customer: "AI Customer",
        },

        playCustomerVoice: "Play customer voice",

        footer: {
          note:
            "Note: This is a front-end demo only. Actual recording and multimodal analysis will be implemented after backend and LLM integration.",
        },

        recording: {
          inProgress: "Recording…",
          notStarted: "Recording not started",
        },

        actions: {
          redo: "Redo Recording",
          sendRound: "Send Round for Analysis",
          startRecording: "Start Recording",
          stopRecording: "Stop Recording",
        },
      },

      /* ======================
         Header
      ====================== */
      header: {
        title: "AI Sales Training Lite",
        subtitle: "AI customer dialogue simulation · Sales scenario training",
        badge: "Demo version – Trae integration supported",
      },

      /* ======================
         ConfigPanel
      ====================== */
      config: {
        title: "Training Setup",
        brand: {
          label: "Brand",
          placeholder: "Select a training brand",
        },

        persona: {
          label: "Customer Persona",
          placeholder: "Select a persona",
          // ✅ 你要求的“短版本英文”（会用于 ChatPanel 顶部 badge / 配置展示）
          options: {
            hnw: "High-net-worth",
            tourist: "Tourist",
            hesitant: "Hesitant buyer",
            gift: "Gift buyer",
            priceSensitive: "Price-sensitive",
          },
        },

        scenario: {
          label: "Sales Scenario",
          placeholder: "Select a scenario",
          // ✅ 你要求的“短版本英文”
          options: {
            firstVisit: "First visit",
            vipReturn: "VIP revisit",
            giftForBoss: "Gift for boss",
            dutyFree: "Duty-free store",
            onlineInquiry: "Online inquiry",
          },
        },

        difficulty: {
          label: "Difficulty",
          options: {
            basic: "Basic",
            intermediate: "Intermediate",
            advanced: "Advanced",
          },
        },

        actions: {
          start: "Start Training",
          reset: "Reset",
        },

        footer: {
          note: "Demo version. Trae-powered AI logic will be integrated in the next release.",
        },
      },

      /* ======================
         ResultPanel
      ====================== */
      result: {
        header: {
          title: "Session Overview",
          subtitle: "After training starts, multi-dimensional analysis results will appear here.",
        },

        tabs: {
          realtime: "Live Tips",
          score: "Score",
          summary: "Summary",
        },

        status: {
          notStarted: "Not Started",
          inProgress: "In Progress",
          completed: "Completed",
        },

        realtimeTips: {
          speed: {
            title: "Speaking speed",
            suggestion: "Try slowing down a little so the customer can understand more easily.",
          },
          politeness: {
            title: "Politeness",
            suggestion: "Maintain a warm and friendly tone to build trust.",
          },
          structure: {
            title: "Clarity & structure",
            suggestion: "Present product benefits in bullet points for clearer structure.",
          },
        },

        realtimeFuture: {
          title: "Coming soon: real-time emotion & tone monitoring",
          desc:
            "Reserved for future multimodal integration (voice emotion / facial expression) to generate live tips.",
        },

        score: {
          realOverallLabel: "Overall score for this session",
          placeholderOverallValue: "82",
          placeholderOverallLabel: "Overall score (placeholder)",
          dimensionTitle: "Dimension scores",
          placeholderDimTitle: "Dimension scores (sample data)",
        },

        dimensions: {
          needsDiscovery: "Needs discovery",
          productKnowledge: "Product knowledge",
          objectionHandling: "Objection handling",
          emotionalConnection: "Emotional connection",
          closingSkill: "Closing skills",
        },

        mockDims: {
          contentExpression: "Content & expression",
          tonePolite: "Polite tone",
          emotionStable: "Emotional stability",
          customerFocus: "Customer focus",
          professionalImage: "Professional image",
        },

        radar: {
          title: "Radar chart placeholder",
          code: "id = 'scoreRadarPlaceholder'",
          desc: "To be implemented with a chart library later",
        },

        summary: {
          placeholderIntro:
            "After analysis, AI will generate an overall evaluation, key strengths, and areas for improvement for this simulation.",
          overallTitle: "Overall evaluation",
          overallText:
            "In this sales simulation, you demonstrated solid professionalism and communication skills. You showed good product understanding, captured customer needs effectively, and provided tailored recommendations.",
          strengthsTitle: "Strengths",
          strengths: [
            "Clear and fluent communication with strong logic",
            "Good listening skills and ability to capture key signals",
            "Professional product introduction highlighting core selling points",
          ],
          improvementTitle: "Improvements",
          improvements: [
            "Add more emotional resonance to build deeper customer connection",
            "Handle objections more flexibly by offering multiple solution angles",
            "Proactively guide closing at the right time and control the sales rhythm",
          ],
        },

        export: {
          placeholder: "Export report (placeholder)",
        },
      },
    },
  },
};

/* ======================
   i18n init
====================== */

const savedLang = localStorage.getItem("lang");

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang === "en" ? "en" : "zh",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
