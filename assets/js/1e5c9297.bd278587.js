(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{74:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return o})),n.d(t,"metadata",(function(){return i})),n.d(t,"toc",(function(){return u})),n.d(t,"default",(function(){return m}));var r=n(3),s=n(7),a=(n(0),n(91)),o={sidebar_position:2},i={unversionedId:"guides/global-state-management",id:"guides/global-state-management",isDocsHomePage:!1,title:"Global State Management",description:"TODO",source:"@site/docs/guides/global-state-management.md",sourceDirName:"guides",slug:"/guides/global-state-management",permalink:"/a-stream/docs/guides/global-state-management",editUrl:"https://github.com/robianmcd/a-stream/edit/master/docs-site/docs/guides/global-state-management.md",version:"current",sidebarPosition:2,frontMatter:{sidebar_position:2},sidebar:"tutorialSidebar",previous:{title:"Getting Started",permalink:"/a-stream/docs/guides/getting-started"},next:{title:"AStream",permalink:"/a-stream/docs/api-reference/a-stream"}},u=[],c={toc:u};function m(e){var t=e.components,n=Object(s.a)(e,["components"]);return Object(a.b)("wrapper",Object(r.a)({},c,n,{components:t,mdxType:"MDXLayout"}),Object(a.b)("p",null,"TODO"),Object(a.b)("pre",null,Object(a.b)("code",{parentName:"pre",className:"language-typescript",metastring:"title=user-service.ts",title:"user-service.ts"},"const userStream = new AStream((username, password) => {\n    return axios.post('/api/login', {username, password})\n        .then(response => response.data);\n});\n\nexport function login(username, password) {\n    return userStream(username, password);\n}\n\nexport function getUserStream() {\n    return this.userStream.asReadonly();\n}\n\nexport function isLoggedIn() {\n    return this.userStream.hasValue();\n}\n")),Object(a.b)("pre",null,Object(a.b)("code",{parentName:"pre",className:"language-typescript",metastring:"title=login.component.ts",title:"login.component.ts"},"import * as userService from './user-service'\n\nasync function onLogin(username, password) {\n    await userService.login(username, password);\n    router.go('/profile');\n}\n")),Object(a.b)("pre",null,Object(a.b)("code",{parentName:"pre",className:"language-typescript",metastring:"title=profile.component.ts",title:"profile.component.ts"},"import * as userService from './user-service'\n\n\n\nfunction onInit(setState) {\n    if (!userService.isLoggedIn()) {\n        router.go('/login');\n    }\n    \n    this.userStream = userService.getUserStream()\n        .next(user => {\n            setState({user});\n            return user;\n        });\n}\n\nfunction render(state) {\n    return `Hello ${state.user.name}`;\n}\n\nfunction onCleanup() {\n    userService.getUserStream().disconnectDownstream(this.userStream);\n}\n")))}m.isMDXComponent=!0}}]);