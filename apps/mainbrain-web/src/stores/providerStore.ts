import type { Provider } from "../../../../packages/shared-types/src";

export interface ProviderStoreState {
  providers: Provider[];
  activeProviderId: string | null;
}

export const initialProviderStoreState: ProviderStoreState = {
  providers: [],
  activeProviderId: null,
};
