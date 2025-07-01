const supabase = require('./supabase');

async function getGuildConfig(guildId) {
  const { data, error } = await supabase
    .from('guild_configs')
    .select('config')
    .eq('guild_id', guildId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // ignore not found error
  return data?.config || {};
}

async function setGuildConfig(guildId, newPartialConfig) {
  const current = await getGuildConfig(guildId);
  const updatedConfig = { ...current, ...newPartialConfig };

  const { error } = await supabase
    .from('guild_configs')
    .upsert({ guild_id: guildId, config: updatedConfig });

  if (error) throw error;
  return updatedConfig;
}

module.exports = { getGuildConfig, setGuildConfig };
