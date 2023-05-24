#!/usr/bin/env node
import autoscaling = require('@aws-cdk/aws-autoscaling')
import ec2 = require('@aws-cdk/aws-ec2')
import { ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2'
import { App, Stack } from '@aws-cdk/core'

export class LoadBalancerStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id)

    const vpc = new ec2.Vpc(this, 'VPC')

    const lb = new ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true
    })

    const sg = new ec2.SecurityGroup(this, 'instanceSg', {
        vpc,
        allowAllOutbound: false
    })

    sg.connections.allowFrom(lb, ec2.Port.tcp(80), 'Load balancer to target')

    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443))
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(5432))
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(6379))
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(12001))


    const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
        vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.MICRO),
        machineImage: new ec2.AmazonLinuxImage(),
        securityGroup: sg
      })

    const listener = lb.addListener('Listener', {
      port: 80
    })

    listener.addTargets('Target', {
      port: 80,
      targets: [asg]
    })

    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world')

    asg.scaleOnRequestCount('AModestLoad', {
      targetRequestsPerSecond: 1
    })

    asg.scaleOnCpuUtilization('ScaleOnCPU', {
      targetUtilizationPercent: 40
    })
  }
}