import{t as e}from"./jsx-runtime-DAs1UGHr.js";import{c as t,l as n}from"./chunk-OE4NN4TA-DLYU-kNt.js";import{t as r}from"./message-CBi5-KbP.js";import{t as i}from"./breadcrumb-BrOflnaa.js";import{t as a}from"./button-BU_8JAmd.js";import{t as o}from"./tabs-BotZMgmN.js";import{t as s}from"./card-DtuxOK2X.js";import{n as c,t as l}from"./typography-BpxksG1H.js";var u=e(),{Title:d,Text:f}=l;function p(){let{channelCode:e,ability:l}=n(),p=t(),m=e=>{navigator.clipboard.writeText(e),r.success(`已复制`)};return(0,u.jsxs)(`div`,{style:{padding:24},children:[(0,u.jsx)(i,{style:{marginBottom:16},items:[{title:`Channel Integration`,onClick:()=>p(`/channel-integration`)},{title:e},{title:`Integration`},{title:`Code Integration`,onClick:()=>p(`/channel-integration/${e}/integration/code`)},{title:l}]}),(0,u.jsxs)(d,{level:4,children:[`Code Integration · `,l]}),(0,u.jsxs)(s,{title:`SDK 依赖`,style:{marginBottom:16},children:[(0,u.jsx)(`pre`,{style:{background:`#f6f8fa`,padding:16,borderRadius:6,overflowX:`auto`},children:`<dependency>
  <groupId>com.palmpay</groupId>
  <artifactId>channel-sdk</artifactId>
  <version>2.0.1</version>
</dependency>`}),(0,u.jsx)(a,{icon:(0,u.jsx)(c,{}),onClick:()=>m(`<dependency>
  <groupId>com.palmpay</groupId>
  <artifactId>channel-sdk</artifactId>
  <version>2.0.1</version>
</dependency>`),children:`Copy`})]}),(0,u.jsxs)(s,{title:`接口规范`,style:{marginBottom:16},children:[(0,u.jsx)(f,{children:`需实现以下 SPI 接口：`}),(0,u.jsxs)(`ul`,{children:[(0,u.jsx)(`li`,{children:`ITransactionHandler`}),(0,u.jsx)(`li`,{children:`IQueryHandler`}),(0,u.jsx)(`li`,{children:`IVerifyHandler`})]}),(0,u.jsx)(a,{type:`link`,children:`View Interface Docs`})]}),(0,u.jsx)(s,{title:`代码示例`,children:(0,u.jsx)(o,{items:[`TRANSACTION`,`QUERY`,`VERIFY`].map(e=>({key:e,label:e,children:(0,u.jsx)(`pre`,{style:{background:`#f6f8fa`,padding:16,borderRadius:6,overflowX:`auto`},children:`// ${e} 接入示例
@Component
public class ${e.charAt(0)}${e.slice(1).toLowerCase()}Handler implements I${e.charAt(0)}${e.slice(1).toLowerCase()}Handler {
  @Override
  public ChannelResponse handle(ChannelRequest request) {
    // TODO: 实现渠道对接逻辑
    return ChannelResponse.success();
  }
}`})}))})})]})}export{p as default};