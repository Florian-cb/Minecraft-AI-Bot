require('dotenv').config();
const mineflayer = require('mineflayer');
const { OpenAI } = require('openai');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalFollow } = goals;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 25565,
    username: 'BuddyBot',
    auth: 'offline'
});

bot.loadPlugin(pathfinder);

const chatHistory = [
    {
        role: "system",
        content: "You are BuddyBot, a helpful and funny Minecraft companion who chats with players in-game. Your replies should always be 1 sentence and 256 characters or fewer, since Minecraft chat has a strict character limit."
    }
];

bot.on('spawn', () => {
    console.log('🟢 Bot has spawned in the world.');
    bot.chat('Hello world, I live!');
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    if (message.toLowerCase() === "follow me") {
        const target = bot.players[username]?.entity;
        if (!target) {
            bot.chat("I can't see you!");
            return;
        }

        const mcData = require('minecraft-data')(bot.version);
        const defaultMove = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);

        const goal = new GoalFollow(target, 1);
        bot.pathfinder.setGoal(goal, true);
        bot.chat("I'm right behind you, let's go!");
        return;
    }

    console.log(`${username}: ${message}`);

    try {
        chatHistory.push({ role: "user", content: `${username}: ${message}` });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: chatHistory
        });

        const reply = response.choices[0].message.content;
        chatHistory.push({ role: "assistant", content: reply });

        console.log(`Bot: ${reply}`);
        let trimmed = reply.slice(0, 256);
        const lastPeriod = trimmed.lastIndexOf(".");
        if (lastPeriod !== -1) {
            trimmed = trimmed.slice(0, lastPeriod + 1);
        }
        bot.chat(trimmed);

        if (chatHistory.length > 12) {
            chatHistory.splice(1, 2); // Keep system message, prune oldest turns
        }
    } catch (error) {
        console.error("❌ GPT Error:", error);
        bot.chat("Sorry I can't help you with that right now.");
    }
});
