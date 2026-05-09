package com.volt.activity;

import com.volt.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "routes")
public class Route extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false, unique = true)
    private Activity activity;

    // Google encoded polyline format
    @Column(columnDefinition = "TEXT")
    private String encodedPolyline;

    // JSON array of elevation points paired with the polyline
    @Column(columnDefinition = "TEXT")
    private String elevationData;

    public Activity getActivity() { return activity; }
    public void setActivity(Activity activity) { this.activity = activity; }

    public String getEncodedPolyline() { return encodedPolyline; }
    public void setEncodedPolyline(String encodedPolyline) { this.encodedPolyline = encodedPolyline; }

    public String getElevationData() { return elevationData; }
    public void setElevationData(String elevationData) { this.elevationData = elevationData; }
}
