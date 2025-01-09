require('dotenv').config();
const express = require('express');
const app = express();
const token = process.env.TOKEN;

app.listen(3000, () => {
    console.log('running');
});

//responds when the root directory is requested through HTTPS
//keeps bot active when pinged through uptimerobot
app.get('/', (req, res) => {
    res.send('please work');
});

//creates discord constant and sets up permissions
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent],
});

//responds with 'hi' when someone says 'hey' using messageCreate event  
client.on('messageCreate', message => {
    if(message.content === 'hey') {
        message.channel.send('hi');		
    }
})

//SLASH COMMAND SECTION
const fs = require('node:fs');
const path = require('node:path');


//sets up slash commands
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

//iterates through all js files in utility folder, adding commands to commands Collection
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}


//handles the interaction for every executed slash command
client.on(Events.InteractionCreate, async interaction => {
	console.log(`Interaction received: ${interaction.commandName}`);
	
    //filters interactions that aren't slash commands 
	if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}

});

client.login(token);

