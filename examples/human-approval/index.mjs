import { createAgent, createWorkflow, reference } from '@agentprodready/agent-framework';

const refundAgent = createAgent({
  name: 'refund',
  model: reference(),
  instructions: 'Process refunds',
});

const workflow = createWorkflow({
  name: 'refund',
  steps: [
    {
      id: 'refund',
      run: refundAgent,
      approval: {
        requiredWhen: ({ input }) => input.includes('1000'),
      },
    },
  ],
});

const waiting = await workflow.run('Refund 1000 dollars');
console.log(waiting.status, waiting.approvalId);

if (waiting.status === 'waiting' && waiting.approvalId) {
  const done = await workflow.approve(waiting.runId, {
    approvalId: waiting.approvalId,
    approved: true,
    approvedBy: 'user-123',
  });
  console.log(done.status, done.text);
}

await refundAgent.close();
