#!/usr/bin/env python3
"""
Backend API Tests for Axis Audio Dashboard
Tests all endpoints: /health, /speakers, /zones, /sources, /sessions
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class AxisAudioAPITester:
    def __init__(self, base_url="https://96814479-557a-4769-9e85-d15db86a752f.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'speakers': [],
            'zones': [],
            'sources': [],
            'sessions': []
        }

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    if response_data:
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    response_data = {}
                return True, response_data
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json() if response.content else {}
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "/",
            200
        )
        return success

    def test_speakers_endpoints(self):
        """Test all speaker-related endpoints"""
        print("\n📢 Testing Speaker Endpoints")
        
        # Get speakers
        success, speakers = self.run_test(
            "Get Speakers",
            "GET",
            "/speakers",
            200
        )
        if not success:
            return False

        # Discover speakers
        success, discovery = self.run_test(
            "Discover Speakers",
            "GET",
            "/speakers/discover",
            200
        )
        if not success:
            return False

        # Get speakers again to see discovered ones
        success, updated_speakers = self.run_test(
            "Get Updated Speakers",
            "GET",
            "/speakers",
            200
        )
        if not success:
            return False

        # Test volume control if speakers exist
        if updated_speakers and len(updated_speakers) > 0:
            speaker_id = updated_speakers[0]['id']
            success, volume_response = self.run_test(
                "Set Speaker Volume",
                "PUT",
                f"/speakers/{speaker_id}/volume",
                200,
                {"volume": 75}
            )
            if not success:
                return False

        return True

    def test_zones_endpoints(self):
        """Test all zone-related endpoints"""
        print("\n🏠 Testing Zone Endpoints")
        
        # Get zones
        success, zones = self.run_test(
            "Get Zones",
            "GET",
            "/zones",
            200
        )
        if not success:
            return False

        # Get speakers first to create zone with them
        success, speakers = self.run_test(
            "Get Speakers for Zone Creation",
            "GET",
            "/speakers",
            200
        )
        if not success:
            return False

        # Create a new zone
        speaker_ids = [speaker['id'] for speaker in speakers[:2]] if speakers else []
        zone_data = {
            "name": "Test Zone Audio",
            "description": "Zone de test pour les tests automatisés",
            "speaker_ids": speaker_ids
        }
        
        success, new_zone = self.run_test(
            "Create Zone",
            "POST",
            "/zones",
            200,
            zone_data
        )
        if success and new_zone:
            self.created_resources['zones'].append(new_zone['id'])

        # Update zone if created successfully
        if success and new_zone:
            zone_id = new_zone['id']
            update_data = {
                "name": "Test Zone Updated",
                "description": "Zone mise à jour"
            }
            success, updated_zone = self.run_test(
                "Update Zone",
                "PUT",
                f"/zones/{zone_id}",
                200,
                update_data
            )

        return True

    def test_sources_endpoints(self):
        """Test all audio source endpoints"""
        print("\n🎵 Testing Audio Source Endpoints")
        
        # Get sources
        success, sources = self.run_test(
            "Get Audio Sources",
            "GET",
            "/sources",
            200
        )
        if not success:
            return False

        # Create streaming source
        streaming_source = {
            "name": "Test Streaming Source",
            "type": "streaming",
            "url": "https://example.com/stream.mp3",
            "metadata": {"genre": "test", "duration": 180}
        }
        
        success, new_streaming = self.run_test(
            "Create Streaming Source",
            "POST",
            "/sources",
            200,
            streaming_source
        )
        if success and new_streaming:
            self.created_resources['sources'].append(new_streaming['id'])

        # Create local file source
        local_source = {
            "name": "Test Local Source",
            "type": "local_file",
            "file_path": "/path/to/test/audio.mp3",
            "metadata": {"artist": "Test Artist", "album": "Test Album"}
        }
        
        success, new_local = self.run_test(
            "Create Local File Source",
            "POST",
            "/sources",
            200,
            local_source
        )
        if success and new_local:
            self.created_resources['sources'].append(new_local['id'])

        return True

    def test_sessions_endpoints(self):
        """Test all audio session endpoints"""
        print("\n🎧 Testing Audio Session Endpoints")
        
        # Get sessions
        success, sessions = self.run_test(
            "Get Audio Sessions",
            "GET",
            "/sessions",
            200
        )
        if not success:
            return False

        # Get zones and sources for session creation
        success, zones = self.run_test(
            "Get Zones for Session",
            "GET",
            "/zones",
            200
        )
        if not success:
            return False

        success, sources = self.run_test(
            "Get Sources for Session",
            "GET",
            "/sources",
            200
        )
        if not success:
            return False

        # Create session if we have zones and sources
        if zones and sources:
            session_data = {
                "name": "Test Audio Session",
                "zone_id": zones[0]['id'],
                "source_id": sources[0]['id']
            }
            
            success, new_session = self.run_test(
                "Create Audio Session",
                "POST",
                "/sessions",
                200,
                session_data
            )
            if success and new_session:
                self.created_resources['sessions'].append(new_session['id'])
                session_id = new_session['id']

                # Test playback controls
                success, pause_response = self.run_test(
                    "Pause Session",
                    "PUT",
                    f"/sessions/{session_id}/control",
                    200,
                    {"action": "pause"}
                )

                success, play_response = self.run_test(
                    "Play Session",
                    "PUT",
                    f"/sessions/{session_id}/control",
                    200,
                    {"action": "play"}
                )

                success, stop_response = self.run_test(
                    "Stop Session",
                    "PUT",
                    f"/sessions/{session_id}/control",
                    200,
                    {"action": "stop"}
                )

        return True

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete sessions
        for session_id in self.created_resources['sessions']:
            self.run_test(
                f"Delete Session {session_id}",
                "DELETE",
                f"/sessions/{session_id}",
                200
            )

        # Delete sources
        for source_id in self.created_resources['sources']:
            self.run_test(
                f"Delete Source {source_id}",
                "DELETE",
                f"/sources/{source_id}",
                200
            )

        # Delete zones
        for zone_id in self.created_resources['zones']:
            self.run_test(
                f"Delete Zone {zone_id}",
                "DELETE",
                f"/zones/{zone_id}",
                200
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Axis Audio Dashboard API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)

        try:
            # Basic endpoints
            if not self.test_health_endpoint():
                print("❌ Health check failed, stopping tests")
                return 1

            if not self.test_root_endpoint():
                print("❌ Root API failed, stopping tests")
                return 1

            # Core functionality tests
            self.test_speakers_endpoints()
            self.test_zones_endpoints()
            self.test_sources_endpoints()
            self.test_sessions_endpoints()

            # Cleanup
            self.cleanup_resources()

        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
            return 1
        except Exception as e:
            print(f"\n❌ Unexpected error during testing: {e}")
            return 1

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = AxisAudioAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())