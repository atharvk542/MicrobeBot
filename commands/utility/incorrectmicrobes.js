const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStats } = require("../../databases/incorrectMicrobeList.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('incorrectmicrobes')
		.setDescription('Lists the current top 25 Microbes that you get incorrect the most'),
	async execute(interaction) {
		let menu = new EmbedBuilder()
			.setColor('Blurple')
			.setTitle('Incorrect Questions')
			.setAuthor({ name: 'MicrobeBot'})
							
		let stats = await getUserStats(interaction.user.id);

		stats.sort((a, b) => b.amount - a.amount);

        //usedmicrobes is to check how many microbes are being printed and to make sure its not 0
		let microbes = stats.map(entry => entry.microbe); //gets every single "microbe" string in each object of stats array
		let usedmicrobes = {};

		let loopNum = 0;
		for (const curMicrobe of microbes) {
			const entry = stats.find(entry => entry.microbe === curMicrobe); //finds the amount for ceritified microbe

			if (entry.amount <= 0) continue;
			if (loopNum === 25) break;	//this needs to be after the previous line, as loopNum can't increment if the entry = 0
			
			menu.addFields( { name: curMicrobe, value: entry.amount.toString() });
			
			usedmicrobes[loopNum] = curMicrobe;
			loopNum++;
		}
		
        //if no questions have an incorrect counter > 0, user has no incorrect quesitons
		if (Object.keys(usedmicrobes).length === 0) {
			menu = new EmbedBuilder()
				.setColor('Blurple')
				.setTitle('You currently have 0 incorrect questions')
		}

		await interaction.reply({ embeds: [menu] });
	},
};



