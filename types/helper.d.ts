export interface TutorialStepButton {
  key?: string | null;
  default?: boolean;
  [key: string]: any;
}

export interface TutorialStep {
  initialStep?: boolean;
  img?: string;
  hideTime?: number | null;
  active?: string | Array<string | { selector: string; [key: string]: any }>;
  buttons?: TutorialStepButton[];
  prepare?: (data: { step: TutorialStep; user: any }) => void;
  [key: string]: any;
}

export interface TutorialDefinition {
  steps: Record<string, TutorialStep>;
  utils?: Record<string, any>;
}

export interface UpdateTutorialData {
  action?: string;
  step?: string;
  tutorial?: string;
  usedLink?: string;
  workerDealSellerPlayerId?: string;
}

export interface HelperMethods {
  getTutorial(formattedPath: string): TutorialDefinition;
  updateTutorial(user: any, data: UpdateTutorialData): Promise<void>;
}
