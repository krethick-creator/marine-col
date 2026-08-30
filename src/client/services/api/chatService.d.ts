export declare function streamChat(query: string, location: {
    lat: number;
    lon: number;
    locationName?: string;
} | undefined, onStep: (stepName: string, executedSteps: string[]) => void, onEnd: (finalResponse: string, riskAssessment: any) => void, onError: (error: string) => void): Promise<void>;
