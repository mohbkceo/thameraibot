require('dotenv').config();
const { Telegraf } = require('telegraf');
const { Configuration, OpenAIApi } = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require('openai');
const { Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const groupIdsFilePath = path.join(__dirname, './db/group_ids.json');
function loadGroupData() {
    try {
        const data = fs.readFileSync(groupIdsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.log("Error reading or parsing groupids.json, returning empty object");
        return { "grps": {} };  
    }
}
function saveGroupData(groupsData) {
    try {
        fs.writeFileSync(groupIdsFilePath, JSON.stringify(groupsData, null, 2), 'utf8');
        console.log("Group data saved successfully.");
    } catch (err) {
        console.error("Error saving group data:", err);
    }
}

const readFile = (path) => 
    new Promise((resolve, reject) => 
      fs.readFile(path, 'utf-8', (err, data) => err ? reject(err) : resolve(data))
    );
  
  const writeFile = (path, data) => 
    new Promise((resolve, reject) => 
      fs.writeFile(path, data, (err) => err ? reject(err) : resolve())
    );

// Gimini API config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or "gemini-ultra"


// Bot Config
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const botName = "ثامر";
const developerId = parseInt(process.env.DEVELOPER_ID);
const devUsername = process.env.DEV_USERNAME;
const authorizedUsers = JSON.parse(process.env.AUTHORIZED_USERS);
let lastAnswers = "";


   
// bot.use((ctx, next) => {
//     if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
//        ctx.reply("Sorry the bot for now only works with groups soo!, BUT more things coming soon!")
//        ctx.reply("قم باضافة البوت الى مجموعتك للبدأ !! 😊")
//     }
//     return; 
// });



 // Event listener when a new member (your bot) is added to a group
 bot.on('new_chat_members', async (ctx) => {
     const chat = ctx.chat;
     const chatId = chat.id
     if (chat.type === 'group' || chat.type === 'supergroup') {
         const groupsData = loadGroupData(); 
         const groupName = chat.title || 'No name';  // Default if no name
         const groupLink = chat.invite_link || 'No invite link';  // Default if no lin
         
         groupsData.grps[chatId] = {
             name: groupName,
             link: groupLink,
         }
         ctx.sendMessage("شكراً لإضافتك لي في المجموعة! لبدء الدردشة معي، أرسل /start 😊", chatId);
         saveGroupData(groupsData)
         console.log(`Added group: ${groupName} (${chatId})`);
         console.log(groupsData);
     }
 });


bot.start((ctx) => {
    ctx.reply('مرحبًا! 👋 أنا بوت تجريبي 🤖. للاستعمال اضغط /thamer.\nلأي مشاكل أو استفسارات، تواصل مع المطوّر @jjroutledg.\nالبوت ما زال في طور التطوير 🚧، شكرًا على تفهّمك! 😊', { reply_to_message_id: ctx.message.message_id });
});


bot.command(`thamer`, async (ctx) => {
    try {
        const prompt = `Introduce yourself in Algerian Arabic your name is ${botName}, briefly (max 3 lines) and friendly, using emojis. Example: "واش راكم؟ أنا   بوت جديد هنا! 👋 نتمنى نكون عند حسن ظنكم. 😉".`
        const completion = await model.generateContent(prompt);
        const result = await completion.response;
        lastAnswers += result.text() + ", ";
        ctx.reply(result.text() + "\n قم بالرد على الرسائل للاجابة");
    } catch (error) {
        console.error("GiminiAI Error:", error);
        ctx.reply("حدث خطأ أثناء محاولة التقديم.", { reply_to_message_id: ctx.message.message_id });
    }
});


bot.on('message', async (ctx) => {
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === bot.botInfo.id) {
        const messageText = ctx.message.text;
        try {
           const prompt = `Previous answers were "${lastAnswers}" (Don't mention it, just follow the context). Respond to the following message in Algerian Arabic as if you're engaging in a real discussion. Keep the tone rational, relevant to the topic, and slightly lively but professional. Use emojis sparingly to enhance the response, maintaining a focus on delivering thoughtful and on-topic replies: "${messageText}".`;
           const result = await model.generateContent(prompt);
           const response = result.response;
           lastAnswers += response.text() + " , ";
           console.log(lastAnswers);
           ctx.reply(response.text(), { reply_to_message_id: ctx.message.message_id });
        } catch (error) {
            console.error("GiminiAI Error:", error);
            ctx.reply("حدث خطأ أثناء معالجة رسالتك.");
        }
    }
});


bot.launch().then(() => console.log("Bot is running..."));