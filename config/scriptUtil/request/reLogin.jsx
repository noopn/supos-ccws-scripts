import React from 'react';
import ReactDOM from 'react-dom';
import ReLogin from '../ReLogin';

/* eslint-disable */
class ReLoginWrap extends React.PureComponent {
  getsec = (e) => {
    const t = 1 * e.substring(1, e.length);
    const n = e.substring(0, 1);
    return n == 's'
      ? 1e3 * t
      : n == 'h'
        ? 60 * t * 60 * 1e3
        : n == 'd'
          ? 24 * t * 60 * 60 * 1e3
          : void 0;
  };

  setCookie = (e, t, n) => {
    const a = void 0 == n ? 0 : this.getsec(n);
    const i = new Date();
    i.setTime(i.getTime() + 1 * a);
    document.cookie = `${e}=${escape(t)};expires=${i.toGMTString()}`;
  };

  setLoginInfo = e => {
    const t = e.ticket;
    localStorage.setItem('antd-pro-authority', 'user');
    localStorage.setItem('basicFlatMenu', '[]');
    localStorage.setItem('designFlatMenu', '[]');
    localStorage.setItem('loginMsg', JSON.stringify(e));
    localStorage.setItem('ticket', t);
    this.setCookie('suposTicket', t, null, '/', null, null, 2592e3);
  };

  render() {
    const { loginUrl } = this.props;
    const loginMsgStr = localStorage.getItem('loginMsg');
    const userName = loginMsgStr ? JSON.parse(loginMsgStr).username : '';
    return (
      <ReLogin
        onOk={this.setLoginInfo}
        userName={userName}
        loginUrl={loginUrl}
      />
    );
  }
}

export default function (loginUrl) {
  const loginModal = document.getElementsByClassName('supplant-relogin');
  if (!loginModal.length) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    ReactDOM.render(<ReLoginWrap loginUrl={loginUrl} />, container);
  }
}
