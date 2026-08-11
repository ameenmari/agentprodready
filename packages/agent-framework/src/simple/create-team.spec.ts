import { describe, expect, it } from 'vitest';
import { createAgent, createTeam, reference } from './index.js';

describe('createTeam + createAgent integration', () => {
  it('runs a sequential team of Simple agents', async () => {
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
    try {
      const team = createTeam({
        agents: { researcher, analyst },
        strategy: 'sequential',
      });
      const result = await team.run('ecosystem');
      expect(result.status).toBe('completed');
      expect(result.text).toBe('ecosystem');
      expect(result.agentOutputs.researcher?.executionId).toBeTruthy();
      expect(result.agentOutputs.analyst?.executionId).toBeTruthy();
    } finally {
      await researcher.close();
      await analyst.close();
    }
  });
});
