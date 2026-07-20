export interface TrueTakeoffAdapter {
  sendProjectDefinition(): Promise<never>;
}

export class ComingLaterTrueTakeoffAdapter implements TrueTakeoffAdapter {
  async sendProjectDefinition(): Promise<never> {
    throw new Error('COMING LATER: TrueTakeoff integration is intentionally not implemented in this application.');
  }
}
