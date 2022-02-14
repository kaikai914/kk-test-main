import NebulaUI from "nebula-ui";
import "nebula-ui/lib/style.css";
// import createAliOSS from "./alioss";
// import enums from "./enums";
// import { parseISO } from "date-fns";
// import Vue from "vue";

// TODO style

// const defaultExtUplaod = async (uploadFile) => {
//   uploadFile.alioss = createAliOSS();
//   const progress = (progress) => {
//     uploadFile.progress = Math.round(progress * 100);
//   };
//   const { url } = await uploadFile.alioss.upload(uploadFile.file, { progress });
//   return url;
// };

// Vue.component("NUpload", {
//   extends: Upload,
//   props: { upload: { type: Function, default: defaultExtUplaod } },
// });

export default NebulaUI;
