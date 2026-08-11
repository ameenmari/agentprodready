import { createAgent, createTeam, reference } from '@agentprodready/agent-framework';

const researcher = createAgent({
  name: 'researcher',
  model: reference(),
  instructions: 'Research the topic.',
});
const analyst = createAgent({
  name: 'analyst',
  model: reference(),
  instructions: 'Coordinate the team.',
});
const reviewer = createAgent({
  name: 'reviewer',
  model: reference(),
  instructions: 'Review the final result.',
});

const team = createTeam({
  name: 'supervisor-team',
  agents: { researcher, analyst, reviewer },
  strategy: 'supervisor',
  supervisor: 'analyst',
  supervisorDecide: ({ iteration, agentOutputs }) => {
    if (iteration === 1) {
      return { action: 'delegate', agent: 'researcher', task: 'competitors in Australia' };
    }
    if (iteration === 2 && agentOutputs.researcher) {
      return { action: 'delegate', agent: 'reviewer', task: agentOutputs.researcher.text };
    }
    return { action: 'finish', output: 'Market entry looks promising with caveats.' };
  },
});

const result = await team.run('Analyze whether we should enter the Australian market.');
console.log(result.text);

await Promise.all([researcher.close(), analyst.close(), reviewer.close()]);
