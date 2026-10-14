export interface Offer {
  sender: string;
  service: string;
  benefit: string;
  objective: 'conversation' | 'meeting' | 'proposal';
  tone: 'natural' | 'professional';
  mode: 'template' | 'ai';
}
export interface ApproachMessages {
  message: string;
  followup: string;
}
export interface ApproachResult extends ApproachMessages {
  method: 'template' | 'ai';
}
