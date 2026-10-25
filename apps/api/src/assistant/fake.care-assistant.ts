import {
  CareAssistant,
  type ChatTurn,
  type PlantContext,
} from './care-assistant.js';

/** Development and test stand-in; env.ts forbids it in production. */
export class FakeCareAssistant extends CareAssistant {
  readonly name = 'fake';

  async reply(history: ChatTurn[], context: PlantContext | null) {
    const question = history.at(-1)?.content ?? '';
    const plant = context?.nickname ?? context?.species ?? 'bitkiniz';
    return `(Test yanıtı) ${plant} için: "${question.slice(0, 80)}" sorusunu aldım. Toprağın üst kısmı kuruyunca sulayın ve parlak, dolaylı ışıkta tutun.`;
  }
}
