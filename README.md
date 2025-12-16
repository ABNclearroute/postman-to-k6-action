# Postman to k6 Load Testing

A reusable GitHub Action and GitLab CI template that automatically converts Postman collections to k6 load testing scripts and executes them with configurable load profiles (smoke, load, stress, spike) on different runners.

## CI/CD Platform Support

- **GitHub Actions**: Use as a composite action (see [Usage Guide](USAGE.md))
- **GitLab CI/CD**: Use as a GitLab CI template (see [GitLab Usage Guide](GITLAB-USAGE.md))

## Features

- **Runtime Conversion**: Automatically converts Postman collections to k6 scripts at runtime
- **Load Profiles**: Pre-configured load profiles (smoke, load, stress, spike) with customizable thresholds
- **Distributed Execution**: Run different load profiles on different GitHub Actions runners
- **Flexible Configuration**: Customize load profiles via YAML configuration
- **Reusable**: Use as a composite action in any GitHub repository
- **Comprehensive Reporting**: Automatic artifact upload and test results
- **AI-Powered (Optional)**: Intelligent load profile generation and result analysis using AI (see [AI Features](AI-FEATURES.md))

## Quick Start

### Basic Usage

```yaml
name: Load Testing

on:
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Postman to k6 Load Test
        uses: your-org/postman-to-k6-action@v1
        with:
          postman-collection: 'postman/collection.json'
          load-profile: 'smoke'
```

### Running Multiple Profiles

```yaml
name: Load Testing

on:
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        profile: [smoke, load, stress, spike]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Postman to k6 Load Test
        uses: your-org/postman-to-k6-action@v1
        with:
          postman-collection: 'postman/collection.json'
          load-profile: ${{ matrix.profile }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `postman-collection` | Path to Postman collection JSON file | Yes | - |
| `load-profile` | Load profile type: `smoke`, `load`, `stress`, or `spike` | No | `smoke` |
| `runner-label` | GitHub runner label for distributed execution | No | `''` |
| `k6-options` | Additional k6 CLI options | No | `''` |
| `environment-file` | Path to Postman environment file | No | `''` |
| `profiles-config` | Path to load profiles configuration YAML | No | `profiles/load-profiles.yaml` |
| `node-version` | Node.js version for conversion | No | `18` |
| `enable-ai-profile-generation` | Enable AI-powered load profile generation | No | `false` |
| `enable-ai-result-analysis` | Enable AI-powered result analysis | No | `false` |
| `ai-api-key` | API key for AI provider | Conditional | `''` |
| `ai-provider` | AI provider: `openai`, `claude`, or `local` | No | `openai` |
| `ai-model` | AI model to use (provider-specific) | No | provider default |
| `ai-base-url` | Custom API base URL for local models | No | provider default |
| `ai-timeout` | AI API request timeout (ms) | No | `30000` |
| `ai-max-retries` | Maximum retry attempts for AI API calls | No | `2` |
| `api-metadata-file` | Path to API metadata JSON file (domain, business impact) | No | `''` |

> **Note**: AI features are optional and disabled by default. See [AI Features Documentation](AI-FEATURES.md) for details.

## Outputs

| Output | Description |
|--------|-------------|
| `k6-script-path` | Path to the generated k6 script |
| `test-status` | Success or failure status of the test |
| `metrics-url` | Link to metrics (if using k6 cloud) |
| `ai-suggested-profile` | Path to AI-generated load profile (if AI profile generation enabled) |
| `ai-insights-report` | Path to AI insights report (if AI result analysis enabled) |

## Load Profiles

### Smoke Test

Quick validation test to verify basic functionality.

- Duration: 1 minute
- Virtual Users: 1-5
- Purpose: Fast feedback on system availability

### Load Test

Test system under expected normal load conditions.

- Duration: ~9 minutes
- Virtual Users: 10-50 (gradual ramp-up)
- Purpose: Validate performance under normal conditions

### Stress Test

Test system limits and breaking points.

- Duration: ~15 minutes
- Virtual Users: 50-200 (progressive increase)
- Purpose: Identify maximum capacity and failure points

### Spike Test

Simulate sudden traffic surge to test system resilience.

- Duration: ~3 minutes
- Virtual Users: 10-100 (rapid spike)
- Purpose: Test system behavior under sudden load changes

## Configuration

### Custom Load Profiles

You can customize load profiles by creating a `profiles/load-profiles.yaml` file:

```yaml
profiles:
  custom-profile:
    name: "Custom Load Profile"
    description: "My custom load profile"
    stages:
      - duration: "2m"
        target: 20
        rampUp: "30s"
      - duration: "5m"
        target: 20
      - duration: "1m"
        target: 0
        rampDown: "30s"
    thresholds:
      http_req_duration: ["p(95)<2000"]
      http_req_failed: ["rate<0.01"]
```

### Stage Configuration

Each stage can have:

- `duration`: Test duration (e.g., "1m", "30s", "5m")
- `target`: Target number of virtual users
- `rampUp`: Optional ramp-up time
- `rampDown`: Optional ramp-down time

### Thresholds

Define pass/fail criteria for your tests:

- `http_req_duration`: Response time thresholds (e.g., `["p(95)<2000"]`)
- `http_req_failed`: Error rate thresholds (e.g., `["rate<0.01"]`)
- `iteration_duration`: Total iteration time thresholds

## Advanced Usage

### Using Postman Environment Files

```yaml
- name: Run Postman to k6 Load Test
  uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    environment-file: 'postman/environment.json'
    load-profile: 'load'
```

### Custom k6 Options

```yaml
- name: Run Postman to k6 Load Test
  uses: your-org/postman-to-k6-action@v1
  with:
    postman-collection: 'postman/collection.json'
    load-profile: 'stress'
    k6-options: '--out json=results.json --summary-export=summary.json'
```

### Different Runners for Different Profiles

```yaml
jobs:
  load-test:
    runs-on: ${{ matrix.runner }}
    strategy:
      matrix:
        include:
          - profile: smoke
            runner: ubuntu-latest
          - profile: load
            runner: self-hosted
          - profile: stress
            runner: [self-hosted, high-memory]
          - profile: spike
            runner: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Postman to k6 Load Test
        uses: your-org/postman-to-k6-action@v1
        with:
          postman-collection: 'postman/collection.json'
          load-profile: ${{ matrix.profile }}
          runner-label: ${{ matrix.runner }}
```

## Example Workflow

See [`.github/workflows/example.yml`](.github/workflows/example.yml) for a complete example workflow that demonstrates:

- Manual workflow dispatch with inputs
- Matrix strategy for parallel execution
- Different runner configurations
- Result summary generation

## Project Structure

```
/
├── action.yml                    # Main composite action definition (GitHub)
├── .gitlab-ci.yml                # GitLab CI configuration
├── gitlab-ci-template.yml        # Reusable GitLab CI template
├── .gitlab-ci.example.yml        # Example GitLab CI workflow
├── README.md                     # This file
├── USAGE.md                      # GitHub Actions usage guide
├── GITLAB-USAGE.md              # GitLab CI/CD usage guide
├── LICENSE                       # MIT License
├── .github/
│   └── workflows/
│       └── example.yml          # Example GitHub workflow
├── profiles/
│   └── load-profiles.yaml       # Load profile configurations
└── scripts/
    ├── merge-k6-options.js      # Script to merge profile options
    └── setup-k6-profiles.sh     # Profile parsing utility
```

## How It Works

1. Validates the Postman collection JSON file
2. Uses `@apideck/postman-to-k6` to convert the collection to a k6 script
3. Loads the specified load profile from YAML configuration
4. Merges load profile options (stages, thresholds) into the k6 script
5. Runs k6 with the configured load profile
6. Uploads test results and generated scripts as artifacts

## Requirements

- Postman collection exported as JSON (v2.1 format)
- Node.js 18+ (for conversion tool)
- k6 installed (handled automatically by the action)

## Best Practices

1. Start with smoke tests first to validate basic functionality
2. Use proper ramp-up times to avoid overwhelming your system
3. Base thresholds on actual SLA requirements
4. Monitor system resources during stress tests
5. Run load tests in dedicated environments when possible
6. Keep load profile configurations documented and version-controlled

## Troubleshooting

### Collection Not Found

Ensure the path to your Postman collection is correct relative to the repository root:

```yaml
postman-collection: 'path/to/collection.json'  # Correct
postman-collection: './collection.json'        # Also correct
postman-collection: 'collection.json'          # Also correct
```

### Profile Not Found

If you see "Profile not found" warnings:

1. Check that the profile name matches exactly (case-sensitive)
2. Verify your `profiles-config` path points to the correct file
3. Ensure the profile is defined in your YAML configuration

### k6 Execution Fails

- Check that your Postman collection is valid JSON
- Verify environment variables are set correctly
- Review k6 logs in the workflow output
- Ensure your API endpoints are accessible from the GitHub Actions runner

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [@apideck/postman-to-k6](https://github.com/apideck-libraries/postman-to-k6) - Postman to k6 conversion tool
- [Grafana k6](https://k6.io/) - Modern load testing tool
- [Grafana k6 GitHub Actions](https://github.com/grafana/k6-action) - k6 GitHub Actions integration

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

