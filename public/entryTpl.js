const path = require('path');

const renderEntry =(options)=>{
    const importPath = `./${options.componentEntryPath.split('/src/')[1]}/index`;
return `
import React from 'react';
import ReactDOM from 'react-dom';
import App from '${importPath}';
ReactDOM.render(<App/>, document.getElementById('root'));
`
}

module.exports = renderEntry;