export type CouplingLevel = 'file' | 'symbol' | 'subsystem';

export type CouplingEdge = {
  fromFileId: number;
  toFileId: number;
  coChangeCount: number;
  coChangeRatio: number;
  level: CouplingLevel;
};

export type TemporalCouplingCluster = {
  id: string;
  fileIds: number[];
  edges: CouplingEdge[];
  level: CouplingLevel;
  averageRatio: number;
};

export type CouplingNarrative = {
  reason: string;
  severity: 'low' | 'medium' | 'high';
  crossesTeamBoundary: boolean;
};
