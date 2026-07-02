export type ProfileData = {
  name: string;
  handle: string;
  pronouns: string;
  bio: string;
  jobTitle: string;
  location: string;
  social: {
    github:   string;
    twitter:  string;
    linkedin: string;
    website:  string;
  };
  publicProfile: boolean;     // exposed on a public /u/{handle} page
  showEmail: boolean;
  avatarUrl: string | null;
};

export const INITIAL: ProfileData = {
  name: 'Sora Kim',
  handle: 'sora',
  pronouns: 'she/her',
  bio: 'Frontend engineer working on dot-field intelligence. Coffee, k-pop, and very long type signatures.',
  jobTitle: 'Senior Software Engineer',
  location: 'Seoul, South Korea',
  social: {
    github:   'sora',
    twitter:  'sora',
    linkedin: 'sora-kim',
    website:  'sora.dev',
  },
  publicProfile: true,
  showEmail: false,
  avatarUrl: null,
};
