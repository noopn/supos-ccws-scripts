const { LOGIN_API, LOGOUT_API, CURRENT_USER_API } = require("../config");

const { convertPath } = require("./util");

const renderTpl = (info) => {
  return `
import React, { Fragment, useState } from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';

const App = () => {
    const [Component,setComponent] = useState(()=>()=>null);
    ${
      info.isExample
        ? `
    React.useEffect(()=>{
        import('${convertPath(info.componentEntryPath)}').then(C=>{
            setComponent(()=>C.default);
        })
    })
    `
        : `
React.useEffect(()=>{
    const ticket = window.localStorage.getItem('ticket');
    fetch("${LOGOUT_API}",{
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        headers:{
            'Authorization':\`Bearer $\{ticket\}\`
        }
    }).then(()=>{
        return fetch("${LOGIN_API}",{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                autoLogin: false,
                clientId: "ms-content-sample",
                password: "${info.password}",
                userName: "${info.username}"
            })
        }).then(response => response.json()) 
    })
    .then(res=>{
        window.localStorage.setItem('loginMsg',JSON.stringify(res))
        window.localStorage.setItem('ticket',res.ticket);
        return fetch("${CURRENT_USER_API}",{
            method: 'GET',
            headers: {
                "Content-Type": 'application/json; charset=utf-8',
                "Authorization": "Bearer " + res.ticket,
            },
        }).then(response => response.json()) 
    })
    .then(personInfo=>{
        window.localStorage.setItem('personInfo',JSON.stringify(personInfo.userInfo));
        return import('${convertPath(info.componentEntryPath)}')
    }).then(C=>{
        setComponent(()=>C.default);
    })
},[])`
    }

return (<Component/>)
}

ReactDOM.render(
    <App></App>,
    document.getElementById('root')
);`;
};

module.exports = renderTpl;
