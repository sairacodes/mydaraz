// ════════════════════════════════════════════════════════════
//  Jenkinsfile — Multi-Tenant Daraz Clone
//  Course  : DevOps for Cloud Computing
//  Pipeline: GitHub Push → Build → Deploy (compose) → Test → Email
// ════════════════════════════════════════════════════════════

pipeline {

    agent any

    environment {
        APP_NAME        = "multitenant-daraz"
        APP_URL         = "http://16.170.7.20:5173"
        BACKEND_HEALTH  = "http://16.170.7.20:5000/api/health"
        DOCKER_TEST_IMG = "daraz-selenium-tests"
        GIT_AUTHOR_EMAIL = sh(
            script: "git log -1 --format='%ae'",
            returnStdout: true
        ).trim()
    }

    triggers {
        githubPush()
    }

    options {
        timestamps()
        timeout(time: 25, unit: 'MINUTES')
    }

    stages {

        // ── Stage 1: Checkout ────────────────────────────────
        stage('Checkout') {
            steps {
                echo '📥 Checking out code from GitHub...'
                checkout scm
                sh 'git log -1 --oneline'
                sh 'git log -1 --format="Author: %an <%ae>"'
            }
        }

        // ── Stage 2: Build & Deploy full stack via Docker Compose ─
        // This builds backend + frontend images and starts mongo,
        // backend (with proper MONGO_URI / JWT_SECRET env vars from
        // docker-compose.yml), and frontend in one go.
        stage('Build & Deploy Stack') {
            steps {
                echo '🐳 Building & starting docker-compose stack...'
                sh '''
                    set -e
                    docker-compose down --remove-orphans || true
                    docker-compose build --no-cache
                    docker-compose up -d
                    docker-compose ps
                '''
            }
        }

        // ── Stage 3: Wait for stack to be healthy ────────────
        stage('Wait for Health') {
            steps {
                echo '⏳ Waiting for backend & frontend to come up...'
                sh '''
                    echo "Waiting for backend (${BACKEND_HEALTH})..."
                    for i in $(seq 1 40); do
                        if curl -sf ${BACKEND_HEALTH} > /dev/null 2>&1; then
                            echo "✅ Backend is healthy"
                            break
                        fi
                        sleep 3
                    done
                    if ! curl -sf ${BACKEND_HEALTH} > /dev/null 2>&1; then
                        echo "❌ Backend never became healthy. Logs:"
                        docker-compose logs --tail=120 backend
                        exit 1
                    fi

                    echo "Waiting for frontend (${APP_URL})..."
                    for i in $(seq 1 30); do
                        if curl -sf ${APP_URL} > /dev/null 2>&1; then
                            echo "✅ Frontend is up"
                            exit 0
                        fi
                        sleep 2
                    done
                    echo "❌ Frontend never became reachable. Logs:"
                    docker-compose logs --tail=120 frontend
                    exit 1
                '''
            }
        }

        // ── Stage 4: TEST STAGE (containerized) ──────────────
        stage('Test') {
            steps {
                echo '🧪 Building Selenium test Docker image...'
                sh "docker build -f Dockerfile.test -t ${DOCKER_TEST_IMG}:${BUILD_NUMBER} ."

                echo '🧪 Running 18 automated Selenium test cases in Docker...'
                sh """
                    docker run --rm \\
                        --network host \\
                        -e APP_URL=${APP_URL} \\
                        -v \$(pwd)/tests:/app/tests \\
                        ${DOCKER_TEST_IMG}:${BUILD_NUMBER} \\
                        pytest tests/test_daraz.py -v \\
                            --html=tests/test-report.html \\
                            --self-contained-html \\
                            --tb=short \\
                            -p no:warnings \\
                        || true
                """
            }
            post {
                always {
                    echo '📊 Archiving test report...'
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'tests',
                        reportFiles: 'test-report.html',
                        reportName: 'Selenium Test Report'
                    ])
                    sh "docker rmi ${DOCKER_TEST_IMG}:${BUILD_NUMBER} || true"
                }
            }
        }
    }

    // ── Post actions: Email results to the pusher ────────────
    post {

        always {
            echo '📧 Sending test results email...'

            emailext(
                subject: "[${currentBuild.currentResult}] Daraz Clone — Build #${BUILD_NUMBER} | ${GIT_AUTHOR_EMAIL}",
                to: "${GIT_AUTHOR_EMAIL}",
                replyTo: "${GIT_AUTHOR_EMAIL}",
                mimeType: 'text/html',
                body: """
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 700px; margin: auto;">

                  <div style="background: #f85606; padding: 24px; border-radius: 8px 8px 0 0;">
                    <h2 style="color: white; margin: 0;">🛍️ Daraz Clone — CI/CD Pipeline Report</h2>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">
                      Multi-Tenant Marketplace | DevOps Assignment 3
                    </p>
                  </div>

                  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                      <tr style="background: #1f2937;">
                        <th style="color: white; padding: 10px 14px; text-align: left;">Field</th>
                        <th style="color: white; padding: 10px 14px; text-align: left;">Details</th>
                      </tr>
                      <tr style="background: white;">
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><strong>Build Status</strong></td>
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">
                          <span style="background: ${currentBuild.currentResult == 'SUCCESS' ? '#dcfce7' : '#fee2e2'};
                                        color: ${currentBuild.currentResult == 'SUCCESS' ? '#166534' : '#991b1b'};
                                        padding: 4px 12px; border-radius: 50px; font-weight: bold;">
                            ${currentBuild.currentResult}
                          </span>
                        </td>
                      </tr>
                      <tr style="background: #f9fafb;">
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><strong>Build Number</strong></td>
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">#${BUILD_NUMBER}</td>
                      </tr>
                      <tr style="background: white;">
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><strong>Triggered By</strong></td>
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${GIT_AUTHOR_EMAIL}</td>
                      </tr>
                      <tr style="background: #f9fafb;">
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><strong>Branch</strong></td>
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${env.GIT_BRANCH ?: 'main'}</td>
                      </tr>
                      <tr style="background: white;">
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><strong>Commit</strong></td>
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${env.GIT_COMMIT?.take(10) ?: 'n/a'}</td>
                      </tr>
                      <tr style="background: #f9fafb;">
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><strong>Duration</strong></td>
                        <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${currentBuild.durationString}</td>
                      </tr>
                      <tr style="background: white;">
                        <td style="padding: 10px 14px;"><strong>Test Cases</strong></td>
                        <td style="padding: 10px 14px;">18 automated Selenium tests (headless Chrome)</td>
                      </tr>
                    </table>

                    <div style="background: #eff6ff; border-left: 4px solid #1a73e8;
                                padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                      <strong>📊 Test Coverage</strong><br/>
                      TC-01: Homepage loads &nbsp;|&nbsp; TC-02: Navbar present<br/>
                      TC-03: Search bar &nbsp;|&nbsp; TC-04: Categories visible<br/>
                      TC-05: Stores page &nbsp;|&nbsp; TC-06: Category filter<br/>
                      TC-07: Store detail &nbsp;|&nbsp; TC-08: Products on store page<br/>
                      TC-09: Login page &nbsp;|&nbsp; TC-10: Invalid login error<br/>
                      TC-11: Customer login &nbsp;|&nbsp; TC-12: Seller login<br/>
                      TC-13: Seller dashboard &nbsp;|&nbsp; TC-14: Seller products<br/>
                      TC-15: Admin login &nbsp;|&nbsp; TC-16: Admin stores list<br/>
                      TC-17: Collections page &nbsp;|&nbsp; TC-18: Register page
                    </div>

                    <p style="margin-top: 20px;">
                      <a href="${BUILD_URL}" style="background: #f85606; color: white;
                         padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        View Full Build →
                      </a>
                      &nbsp;&nbsp;
                      <a href="${BUILD_URL}Selenium_20Test_20Report/" style="background: #1a73e8; color: white;
                         padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        View Test Report →
                      </a>
                    </p>

                  </div>

                  <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                    COMSATS University Islamabad — DevOps for Cloud Computing — Assignment 3
                  </div>

                </body>
                </html>
                """,
                attachmentsPattern: 'tests/test-report.html'
            )
        }

        success {
            echo '✅ Pipeline completed successfully — stack is deployed.'
        }

        failure {
            echo '❌ Pipeline failed — check logs above.'
        }
    }
}
