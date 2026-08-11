import { createAgent, createTeam, reference } from '@agentprodready/agent-framework';

const researcher = createAgent({
  name: 'researcher',
  model: reference(),
  instructions: 'Research the topic.',
});

const analyst = createAgent({
  name: 'analyst',
  model: reference(),
  instructions: 'Analyze the research.',
});

const team = createTeam({
  name: 'research-team',
  agents: { researcher, analyst },
  strategy: 'sequential',
});

const result = await team.run('Research and analyze the TypeScript AI agent ecosystem.');
console.log(result.text);

await researcher.close();
await analyst.close();
