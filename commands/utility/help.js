const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all commands available for MicrobeBot.'),
	async execute(interaction) {
		const menu = new EmbedBuilder()
			.setColor('Blurple')
			.setTitle('Help Menu')
			.setAuthor({ name: 'MicrobeBot'})
			.addFields(
				{ name: 'Support Discord Server:', value: "https://discord.gg/vWy2he7TnJ"},
                { name: 'Author:', value: 'megaxw, DM me for any questions!'},
				{ name: ' ', value: '\u000A' },
				{ name: '_**Commands**_', value: ' '},
				{ name: '/typeidentify', value: 'Constantly quizzes you on a timer. Given microbes names, identify the type of microbe' },
				{ name: '/diseaseidentify', value: 'Constantly quizzes you on a timer. Given disease names, identify either the microbe name or the microbe type ' + 
					'depending on the mode that you choose (mode:name or mode:type)'},
				{ name: '/dn', value: 'Gives one question about naming a disease given the microbe. '},
				{ name: '/dt', value: 'Gives one question about classifying the type of a disease. '},
				{ name: '/mt', value: 'Gives one question about classifying the type of a microbe. '},
				{ name: '/incorrectdiseases', value: 'Shows the top 25 diseases (in both modes) that you have missed most commonly.'},
				{ name: '/incorrectmicrobes', value: 'Shows the top 25 microbes that you have missed most commonly.'},
				{ name: '/stats', value: 'Shows how many questions of each type you have answered.'},
				{ name: '/server', value: 'Gives information about server'},
			)

		await interaction.reply({ embeds: [menu] });
	},
};