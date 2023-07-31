// import mongoose, { Schema } from "mongoose";
// import { IBase } from "./base";

// // export interface ICampaign extends IBase {
// //   title: string;
// //   status: string;
// //   status: TaskStatus;
// //   campaign: string;
// //   meta_data: {
// //     [k: string]: any;
// //   };
// // }

// // const TaskSchema: Schema = new Schema(
// //   {
// //     process_id: { type: String, required: true },
// //     title: { type: String, required: false },
// //     status: { type: String, default: TaskStatus.PENDING },
// //     campaign: { type: String, required: false },
// //     meta_data: { type: Object, required: false },
// //   },
// //   {
// //     timestamps: {
// //       createdAt: "created_at",
// //       updatedAt: "updated_at",
// //     },
// //     id: true,
// //   }
// // );

// export default mongoose.model<ITask>("Task", TaskSchema);
