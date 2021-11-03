

const dateFormat = (time)=>{

    const date = Number(time)? new Date(Number(time)):new Date();
    let Y = date.getFullYear();
    let M = date.getMonth() + 1;
    let D = date.getDate();
    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();

    M = M<10 ? `0${M}`: String(M);
    D = D<10 ? `0${D}`: String(D);
    h = h<10 ? `0${h}`: String(h);
    m = m<10 ? `0${m}`: String(m);
    s = s<10 ? `0${s}`: String(s);

    return `${Y}-${M}-${D} ${h}:${m}:${s}`
    
}


module.exports = {
    dateFormat,
}