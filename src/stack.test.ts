// import { expect as expectCDK, haveResource, haveResourceLike, arrayWith, objectLike, stringLike } from '@aws-cdk/assert'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { App, Stack } from 'aws-cdk-lib/core'
import { LoadBalancerStack } from './stack'

describe('LoadBalancerStack', () => {
  let testApp: App
  let testStack: Stack

  beforeEach(() => {
    testApp = new App()
    testStack = new LoadBalancerStack(testApp, 'Loadbalancer')
  })

  it('should create an autoscaling group', () => {
    Template.fromStack(testStack).hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
      MaxSize: '1',
      MinSize: '1'
    })
  })

  it('should use the correct instance type', () => {
    Template.fromStack(testStack).hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
      InstanceType: 't3a.micro'
    })
  })

  it('have the required outbound ports open', () => {
    Template.fromStack(testStack).hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupEgress: [
        Match.objectLike({
          ToPort: 443
        }),
        Match.objectLike({
          ToPort: 5432
        }),
        Match.objectLike({
          ToPort: 6379
        }),
        Match.objectLike({
          ToPort: 12001
        })
      ]
    })
  })

  it('should autoscale on CPU load', () => {
    Template.fromStack(testStack).hasResourceProperties('AWS::AutoScaling::ScalingPolicy', {
      TargetTrackingConfiguration: {
        PredefinedMetricSpecification: {
          PredefinedMetricType: 'ASGAverageCPUUtilization'
        },
        TargetValue: 40
      }
    })
  })

  it('should have an IAM role to read from s3', () => {
    Template.fromStack(testStack).hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [Match.objectLike({
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::cdk-alb-test/*',
        })]
      }
    })
  })

  it('should have a userdata script', () => {
    Template.fromStack(testStack).hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
      UserData: {
        "Fn::Base64": Match.stringLikeRegexp('.*/testFile.txt.*')
      }
    })
  })
})
