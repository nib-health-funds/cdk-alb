#!/usr/bin/env node

import { App } from 'aws-cdk-lib/core'
import { LoadBalancerStack } from './stack'

const app = new App()
new LoadBalancerStack(app, 'LoadBalancerStack')
app.synth()
