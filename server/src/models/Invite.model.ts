import mongoose, {Schema,Document, Types} from 'mongoose'


export type InviteStatus="invited"|"accepted"|"declined"|"expired";


export interface IInvite extends Document {

    email:string,
    market_id:Types.ObjectId
    invited_by:Types.ObjectId
    role:string
    permissions:string[]
    invite_token:string
    status:InviteStatus
     expires_at: Date
  accepted_at?: Date
  declined_at?: Date

  createdAt?: Date
  updatedAt?: Date
}


const inviteSchema=new Schema<IInvite>(
    {
        email:{
            type:String,
            required:true,
            lowercase:true,
            trim:true
        },
        market_id:{
            type:Schema.Types.ObjectId,
            ref:"Market",
            required:true 

        },
        invited_by:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true 
        },
        role:{
            type:String,
            required:true 
        },
        permissions:{
            type:[String],  //string array
            required:true
        },
        invite_token:{
            type:String,
            required:true,
            unique:true

        },
        status:{
            type:String,
            enum:["invited", "accepted", "declined", "expired"],
            default:"invited"
        },
         expires_at: {
      type: Date,
      default:null
    },

    accepted_at: Date,
    declined_at: Date,
        

    },
    {timestamps:true}
)


// Automatically delete expired invites 
inviteSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });


export const Invite=mongoose.models.Invite ||  mongoose.model<IInvite>("Invite",inviteSchema);