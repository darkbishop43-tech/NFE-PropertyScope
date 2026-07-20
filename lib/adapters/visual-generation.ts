export interface VisualGenerationRequest {
  sourceImage?: string;
  conceptDescription: string;
  architecturalStyle?: string;
  numberOfFloors?: number;
  possibleUse?: string;
  notes?: string;
}

export interface VisualGenerationResult {
  status: 'PLACEHOLDER';
  message: string;
}

export interface VisualGenerationAdapter {
  generateConcept(request: VisualGenerationRequest): Promise<VisualGenerationResult>;
}

export class MockVisualGenerationAdapter implements VisualGenerationAdapter {
  async generateConcept(): Promise<VisualGenerationResult> {
    return { status: 'PLACEHOLDER', message: 'Visual generation provider is not connected in this MVP build.' };
  }
}
