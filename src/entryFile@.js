const {
    LOGIN_API,
    LOGOUT_API
} = require('../config')



const renderTpl = (info) => {
    return `
import React, { Fragment, useState } from 'react';
import ReactDOM from 'react-dom';
import { Button, Drawer,Form,InputNumber,Switch} from 'antd';
import { SettingTwoTone } from '@ant-design/icons';
import '../public/style.scss';
import 'antd/dist/antd.css'

import Component from '${info.componentEntryPath}'
const App = () => {
    const [visible, setVisible] = useState(false);
    const [width, setWidth] = useState(document.documentElement.clientWidth);
    const [height, setHeight] = useState(document.documentElement.clientHeight);
    const [overflow, setOverFlow] = useState(false);
    const showDrawer = () => {
        setVisible(true);
    };
    const onClose = () => {
        setVisible(false);
    };
    const onFinish = (values) => {
        const {
            height,
            overflow,
            width,
        } = values;
        console.log(height,
            overflow,
            width,)
        if(height)  setHeight(height);
        if(width)  setHeight(width);
        if(overflow)  setOverFlow(overflow);
        
      };
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


return (<Fragment>
    <div width={width} height={height} style={{overflow:overflow?'hidden':'auto'}}>
        <Component/>
    </div>
    <Drawer title="界面配置" placement="right" onClose={onClose} visible={visible}>
        <Form
            name="basic"
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 19 }}
            initialValues={{ remember: true }}
            onFinish={onFinish}
            autoComplete="off"
        >
            <Form.Item
                label="宽度"
                name="width"
            >
                <InputNumber 
                    className='setting_input' style={{ width: '100%' }}
                    min={100}
                />
            </Form.Item>
            <Form.Item
                label="高度"
                name= "height"
            >
                <InputNumber 
                    className='setting_input' style={{ width: '100%' }}
                    min={100}
                />
            </Form.Item>
            <Form.Item
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                label="超出隐藏"
                name= "overflow"
            >
               <Switch checkedChildren="开启" unCheckedChildren="关闭"/>
            </Form.Item>

            <Form.Item
                 wrapperCol={{span: 18, offset: 5 }}
            >
               <Button style={{marginRight:'10px'}}>重置</Button>
               <Button type="primary" htmlType="submit">应用</Button>
            </Form.Item>
        </Form>
    </Drawer>
</Fragment>)
}

ReactDOM.render(
    <App></App>,
    document.getElementById('root')
);`
}


module.exports = renderTpl;