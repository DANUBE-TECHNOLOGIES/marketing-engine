"use strict";
const write=(level,message,context={})=>{
  const line=JSON.stringify({timestamp:new Date().toISOString(),level,message,...context});
  level==="error"?console.error(line):level==="warn"?console.warn(line):console.log(line);
};
module.exports={
  debug:(m,c={})=>{if(process.env.LOG_LEVEL==="debug")write("debug",m,c);},
  info:(m,c={})=>write("info",m,c),
  warn:(m,c={})=>write("warn",m,c),
  error:(m,c={})=>write("error",m,c),
};
