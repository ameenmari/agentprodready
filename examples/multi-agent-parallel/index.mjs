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
const reviewer = createAgent({
  name: 'reviewer',
  model: reference(),
  instructions: 'Review the final result.',
});

const team = createTeam({
  name: 'parallel-team',
  agents: { researcher, analyst, reviewer },
  strategy: 'parallel',
  failurePolicy: 'best-effort',
});

const result = await team.run('Analyze whether we should enter the Australian market.');
console.log(result.text);

await Promise.all([researcher.close(), analyst.close(), reviewer.close()]);
