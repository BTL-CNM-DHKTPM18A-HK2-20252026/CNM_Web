export { ProfileModal } from './components/ProfileModal';
export { SettingsModal } from './components/SettingsModal';
export { StatusIndicator } from './components/StatusIndicator';

export { userService } from './services/userService';
export type { UserResponse } from './services/userService';

export { presenceService } from './services/presenceService';
export type { UserStatusResponse } from './services/presenceService';

export { PresenceProvider, usePresence } from './providers/PresenceProvider';
export type { UserStatus } from './providers/PresenceProvider';

export { useProfile } from './hooks/useProfile';
export type { ProfileFormValues, UserProfileData } from './hooks/useProfile';
