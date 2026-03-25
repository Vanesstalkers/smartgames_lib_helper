import type { ApiContextLike, StatusOkResult } from '../../user/types/api';
import type { UpdateTutorialData } from './helper';

export interface RestoreLinksData {
  inGame?: boolean;
}

export type HelperActionMethod = (context: ApiContextLike, data: UpdateTutorialData) => Promise<StatusOkResult>;
export type HelperRestoreLinksMethod = (
  context: ApiContextLike,
  data?: RestoreLinksData
) => Promise<StatusOkResult>;

export interface HelperApiMethods {
  action: HelperActionMethod;
  restoreLinks: HelperRestoreLinksMethod;
}
