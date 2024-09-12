#!/usr/bin/env node
import autoscaling = require("aws-cdk-lib/aws-autoscaling");
import ec2 = require("aws-cdk-lib/aws-ec2");
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { App, Stack } from "aws-cdk-lib/core";
import iam = require("aws-cdk-lib/aws-iam");
import { Construct } from "constructs";

//Allow outbound traffic from anyIpv4 to port
function addEgressRule(sg: ec2.SecurityGroup, port: number) {
  sg.addEgressRule(
    ec2.Peer.anyIpv4(),
    ec2.Port.tcp(port),
    `Allow outbound traffic on port ${port}`,
  );
}

// Create a security group with egress rules for pot 443, 5432, 6379 adn 12001
function createSecurityGroup(scope: Construct, vpc: ec2.Vpc) {
  const sg = new ec2.SecurityGroup(scope, "instanceSg", {
    vpc,
    allowAllOutbound: false,
  });

  sg.addEgressRule(ec2.Peer.ipv4("0.0.0.0/0"), ec2.Port.tcp(443));

  const ports = [5432, 6379, 12001];

  ports.forEach((port) => {
    addEgressRule(sg, port);
  });

  return sg;
}

// Create an AutoScaling group
function createAutoScalingGroup(
  scope: Construct,
  vpc: ec2.Vpc,
  sg: ec2.SecurityGroup,
  bucketArn: string,
) {
  const asg = new autoscaling.AutoScalingGroup(scope, "ASG", {
    vpc,
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T3A,
      ec2.InstanceSize.MICRO,
    ),
    machineImage: new ec2.AmazonLinuxImage(),
    securityGroup: sg,
  });

  asg.scaleOnCpuUtilization("ScaleOnCpu", {
    targetUtilizationPercent: 40,
  });

  // Add a script in userdata to copy the `testFile.txt` file from s3 to the new instance.
  asg.addUserData(
    `#!/bin/bash
     aws s3 cp ${bucketArn}/testFile.txt /home/ec2-user/`,
  );

  return asg;
}

// Create an Application Load Balancer with port 80 open to the world
function createLoadBalancer(
  scope: Construct,
  vpc: ec2.Vpc,
  sg: ec2.SecurityGroup,
  asg: autoscaling.AutoScalingGroup,
) {
  const lb = new ApplicationLoadBalancer(scope, "LB", {
    vpc,
    internetFacing: true,
  });

  sg.connections.allowFrom(lb, ec2.Port.tcp(80), "Load balancer to target");

  const listener = lb.addListener("Listener", {
    port: 80,
  });

  listener.addTargets("Target", {
    port: 80,
    targets: [asg],
  });

  listener.connections.allowDefaultPortFromAnyIpv4("Open to the world");

  return lb;
}

// Create an S3 read-only role
function createS3ReadRole(scope: Construct, bucketArn: string) {
  const s3ReadRole = new iam.Role(scope, "S3ReadOnlyRole", {
    assumedBy: new iam.ArnPrincipal("arn_for_trusted_principal"),
  });

  s3ReadRole.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`${bucketArn}/*`],
    }),
  );

  return s3ReadRole;
}

export class LoadBalancerStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    const vpc = new ec2.Vpc(this, "VPC");

    //create security group ports  wiht outbound on the ec2 ('443`. `5432`, `6379`, `12001`)
    const sg = createSecurityGroup(this, vpc);

    const s3BuckeArn = "arn:aws:s3:::cdk-alb-test";
    const asg = createAutoScalingGroup(this, vpc, sg, s3BuckeArn);

    //create ALB with port 80 open to the world and target on ASG
    createLoadBalancer(this, vpc, sg, asg);

    createS3ReadRole(this, s3BuckeArn);
  }
}
