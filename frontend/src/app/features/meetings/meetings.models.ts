export interface MeetingStatus {configured:boolean;canCreate:boolean;provider:string;paidFeatures:boolean;}
export interface MeetingSession {appId:string;room:string;jwt:string;expiresAt:number;}
export const validRoom=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
