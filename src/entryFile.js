const {
    LOGIN_API,
    LOGOUT_API
} = require('../config')



const renderTpl = (info) => {
    return `
import React, { Fragment, useState } from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';

import Component from '${info.componentEntryPath}'
const App = () => {
    ${info.isExample ? '' : `
React.useEffect(async ()=>{
    const ticket = window.localStorage.getItem('ticket');
    await fetch("${LOGOUT_API}",{
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        headers:{
            'Authorization':\`Bearer $\{ticket\}\`
        }
    });
    await fetch("${LOGIN_API}",{
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
    })
    .then(response => response.json()) 
    .then(res=>{
        window.localStorage.setItem('loginMsg',JSON.stringify(res))
        window.localStorage.setItem('ticket',res.ticket)
    })
},[])` }


return (<Component/>)
}

ReactDOM.render(
    <App></App>,
    document.getElementById('root')
);`
}


module.exports = renderTpl;