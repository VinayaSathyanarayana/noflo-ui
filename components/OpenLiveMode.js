const noflo = require('noflo');
const uuid = require('uuid/v4');
const { loadGraph, ensureIframe, getRemoteNodes } = require('../src/runtime');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('client',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'client')) { return; }
    const [route, client] = input.getData('in', 'client');

    const state = {
      state: 'ok',
      graphs: [],
      remote: route.nodes || [],
      project: {},
      component: null,
      runtime: route.runtime,
    };

    Promise.resolve()
      .then(() => ensureIframe(client, {
        id: uuid(),
      }))
      .then(() => client.connect())
      .then((def) => {
        // Start by loading main graph
        if (!def.graph) {
          return Promise.reject(new Error(`Runtime ${def.id} is not running a graph`));
        }

        // TODO: Populate project information

        return client.protocol.component.getsource({
          name: def.graph,
        });
      })
      .then(source => loadGraph({
        ...source,
        name: client.definition.graph, // Ensure graph gets the name runtime supplied
      }))
      .then(graphInstance => state.graphs.push(graphInstance))
      .then(() => getRemoteNodes(client, state))
      .then(() => output.send({ out: state }))
      .then((() => output.done()), err => output.done(err));
  });
};
