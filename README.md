# CDK-ALB
<!--BEGIN STABILITY BANNER-->
---

This example creates an AutoScalingGroup (containing a Micro-T2 EC2 instance running Amazon Linux AMI), and an ApplicationLoadBalancer inside a shared VPC. It hooks up an open listener from the Load Balancer to the Scaling Group to indicate how many targets to balance between.


## How to Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
$ npm install -g aws-cdk
$ npm install
$ npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## How to test

```bash
$ npm run lint
$ npm run build && npm run test
```

## Tasks

1. Update the instance type to something more modern `t3a`
2. Open up 3 additional ports outbound on the ec2 (`5432`, `6379`, `12001`)
