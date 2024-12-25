const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Lists all commands available for MicrobeBot.'),
	async execute(interaction) {
		const menu = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Help Menu')
			.setAuthor({ name: 'MicrobeBot'})
			.addFields(
				{ name: '/typeidentify', value: 'Given microbes names, identify the type of microbe' },
				{ name: '/diseaseidentify', value: 'Given disease names, identify the microbe type that causes the disease'},
				{ name: '/server', value: 'Gives information about server'},

			)

		await interaction.reply({ embeds: [menu] });
	},
};