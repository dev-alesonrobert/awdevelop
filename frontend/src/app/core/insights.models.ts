export interface CommercialInsights {
 stages: {stage:string;count:number;value:number}[];
 total:number;openValue:number;contacted:number;won:number;lost:number;closed:number;winRate:number|null;
}
export interface UsageQuota {used:number;limit:number;remaining:number;percent:number;resetsAt:string;}
export interface UsageBudget {id:string;label:string;enabled:boolean;daily:UsageQuota;monthly?:UsageQuota;}
export interface Insights {commercial:CommercialInsights;usage:UsageBudget[];updatedAt:string;}
