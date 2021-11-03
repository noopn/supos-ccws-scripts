
import React from 'react';
import ReactDOM from 'react-dom';
import Component from '/home/supreme/Dropbox/Workspace/supos-ccws/src/新通用组件库/component1/source'
const App = () => {
    React.useEffect(async ()=>{
        const ticket = window.localStorage.getItem('ticket');
        await fetch("/inter-api/auth/logout",{
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            headers:{
                'Authorization':`Bearer ${ticket}`
            }
        });
        await fetch("/inter-api/auth/login",{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                autoLogin: false,
                clientId: "ms-content-sample",
                password: "Supos1304@",
                userName: "admin"
            })
        })
        .then(response => response.json()) 
        .then(res=>{
            console.log(res);
            window.localStorage.setItem('loginMsg',JSON.stringify(res))
            window.localStorage.setItem('ticket',res.ticket)
        })
    },[])
    return <Component />
}

ReactDOM.render(
    <App></App>,
    document.getElementById('root')
);