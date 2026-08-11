import { createAgent, createWorkflow, reference } from '@agentprodready/agent-framework';

const researcher = createAgent({
  name: 'researcher',
  model: reference(),
  instructions: 'Research',
});
const analyst = createAgent({
  name: 'analyst',
  model: reference(),
  instructions: 'Analyze',
});

const workflow = createWorkflow({
  name: 'market-analysis',
  steps: [
    { id: 'research', run: researcher },
    { id: 'analysis', run: analyst, dependsOn: ['research'] },
  ],
});

const result = await workflow.run('TypeScript AI agent ecosystem');
console.log(result.text);

await researcher.close();
await analyst.close();
