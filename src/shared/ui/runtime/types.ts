export type DialogCloseReason = 'escape' | 'backdrop' | 'action' | 'scope-disposed';

export type LayerKind =
  | 'tooltip'
  | 'menu'
  | 'dropdown'
  | 'drawer'
  | 'modal'
  | 'overlay'
  | 'toast'
  | 'devtools';

export type UiOwnerRef = {
  ownerId: string;
  scopeInstanceId: string;
  workspaceId?: string;
  tabId?: string;
};

export type Keybinding = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  ignoreInputs?: boolean;
};
