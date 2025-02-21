#!/usr/bin/env node
import autoscaling = require('aws-cdk-lib/aws-autoscaling')
import ec2 = require('aws-cdk-lib/aws-ec2')
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { App, Stack } from 'aws-cdk-lib/core'
import * as iam from 'aws-cdk-lib/aws-iam'

export class LoadBalancerStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id)

    const S3_BUCKET_NAME = 'cdk-alb-test-s3-bucket'

    const vpc = new ec2.Vpc(this, 'VPC')

    const lb = new ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: true
    })

    // Add to copy data from S3
    const userData = ec2.UserData.forLinux();
    userData.addCommands(`s3://${S3_BUCKET_NAME}/testFile.txt /home/ec2-user/myfile.txt`);

    const testRole = new iam.Role(this, 'MyRole', {
      assumedBy: new iam.ServicePrincipal('sns.amazonaws.com'),
    });

    testRole.addToPolicy(new iam.PolicyStatement({
      resources: ['arn:aws:s3:::cdk-alb-test/*'],
      actions: ['s3:GetObject'],
    }));

    const sg = new ec2.SecurityGroup(this, 'instanceSg', {
      vpc,
      allowAllOutbound: false
    })
    sg.connections.allowFrom(lb, ec2.Port.tcp(80), 'Load balancer to target')
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443))
    // Open up 3 additional ports outbound on the ec2 (5432, 6379, 12001)
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(5432), 'Add additional ports')
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(6379), 'Add additional ports')
    sg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(12001), 'Add additional ports')

    const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3A, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage(),
      securityGroup: sg,
      role: testRole,
      userData: userData
    })

    asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 40, // Scale when CPU exceeds 40%
    });

    const listener = lb.addListener('Listener', {
      port: 80
    })

    listener.addTargets('Target', {
      port: 80,
      targets: [asg]
    })

    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world')

    asg.scaleOnRequestCount('AModestLoad', {
      targetRequestsPerMinute: 1
    })
  }
}
