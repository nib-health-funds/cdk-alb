import { SynthUtils } from '@aws-cdk/assert'
import { App } from '@aws-cdk/core'
import { LoadBalancerStack } from './stack'

test('Creates the speficied stack', () => {
  const app = new App();
  const stack = new LoadBalancerStack(app, 'LoadBalancer');
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
})